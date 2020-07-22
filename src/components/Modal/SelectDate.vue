<template>
  <UiModal :open="open" @close="$emit('close')">
    <form @submit.prevent="handleSubmit" class="modal-body">
      <div v-if="step === 0">
        <h3 class="m-4 text-center">Select a date</h3>
        <div class="modal-body m-4">
          <UiCalendar v-model="input" class="mx-auto mb-2" />
        </div>
      </div>
      <div v-else>
        <h3 class="m-4 mb-0 text-center">Select a time UTC</h3>
        <div class="d-flex m-4 mx-auto" style="max-width: 360px;">
          <div class="col-4 px-0 pr-2">
            <UiButton class="px-0 width-fit">
              <input
                v-model="form.h"
                max="24"
                class="input text-center width-fit"
              />
            </UiButton>
          </div>
          <div class="col-4 px-0 pr-2">
            <UiButton class="px-0 width-fit">
              <input
                v-model="form.m"
                max="60"
                class="input text-center width-fit"
              />
            </UiButton>
          </div>
          <div class="col-4 px-0 pr-2">
            <UiButton class="px-0 width-fit">
              <input
                v-model="form.s"
                max="60"
                class="input text-center width-fit"
              />
            </UiButton>
          </div>
        </div>
      </div>
      <div class="p-4 overflow-hidden text-center border-top">
        <div class="col-6 float-left pr-2">
          <UiButton @click="$emit('close')" type="button" class="width-full">
            Cancel
          </UiButton>
        </div>
        <div class="col-6 float-left pl-2">
          <UiButton type="submit" class="width-full button--submit">
            <span v-if="step === 0">Next</span>
            <span v-else>Select</span>
          </UiButton>
        </div>
      </div>
    </form>
  </UiModal>
</template>

<script>
export default {
  props: ['open', 'value'],
  data() {
    return {
      input: '',
      step: 0,
      form: {
        h: '00',
        m: '00',
        s: '00'
      }
    };
  },
  watch: {
    open() {
      this.step = 0;
      this.form = { h: '00', m: '00', s: '00' };
      this.input = this.value;
    }
  },
  methods: {
    handleSubmit() {
      if (this.step === 0) return (this.step = 1);
      const [year, month, day] = this.input.split('-');
      let input = Date.UTC(
        year,
        month - 1,
        day,
        this.form.h,
        this.form.m,
        this.form.s
      );
      input = new Date(input).getTime() / (1e3).toFixed();
      this.$emit('input', input);
      this.$emit('close');
    }
  }
};
</script>
